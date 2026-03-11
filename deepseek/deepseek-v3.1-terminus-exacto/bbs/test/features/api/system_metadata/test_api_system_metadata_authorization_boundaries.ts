import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusType";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemMetadatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_system_metadata_create } from "../../../generate/generate_random_discussion_board_super_admin_system_metadata_create";
import { prepare_random_discussion_board_system_metadatum } from "../../../prepare/prepare_random_discussion_board_system_metadatum";

export async function test_api_system_metadata_authorization_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection and create system metadata
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  const systemMetadata =
    await generate_random_discussion_board_super_admin_system_metadata_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          value: RandomGenerator.alphabets(20),
          data_type: "string",
          scope: "global",
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardSystemMetadatum.ICreate,
      },
    );
  typia.assert(systemMetadata);
  // Test super admin access - should succeed
  const superAdminAccess =
    await api.functional.discussionBoard.superAdmin.system_metadata.at(
      superAdminConnection,
      {
        metadataId: systemMetadata.id,
      },
    );
  typia.assert(superAdminAccess);
  TestValidator.equals(
    "super admin should access system metadata",
    superAdminAccess.id,
    systemMetadata.id,
  );
  // Test regular admin access - should fail with 403
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  await TestValidator.httpError(
    "regular admin should get 403 Forbidden",
    403,
    async () => {
      await api.functional.discussionBoard.superAdmin.system_metadata.at(
        adminConnection,
        {
          metadataId: systemMetadata.id,
        },
      );
    },
  );
  // Test member access - should fail with 403
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  await TestValidator.httpError(
    "member should get 403 Forbidden",
    403,
    async () => {
      await api.functional.discussionBoard.superAdmin.system_metadata.at(
        memberConnection,
        {
          metadataId: systemMetadata.id,
        },
      );
    },
  );
  // Test guest access (no authentication) - should fail with 401 or 403
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "guest should get authentication error",
    [401, 403],
    async () => {
      await api.functional.discussionBoard.superAdmin.system_metadata.at(
        guestConnection,
        {
          metadataId: systemMetadata.id,
        },
      );
    },
  );
  // Test with invalid JWT token format
  const invalidTokenConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization:
        "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.token",
    },
  };
  await TestValidator.httpError(
    "invalid token should get authentication error",
    [401, 403],
    async () => {
      await api.functional.discussionBoard.superAdmin.system_metadata.at(
        invalidTokenConnection,
        {
          metadataId: systemMetadata.id,
        },
      );
    },
  );
  // Test with expired token (simulated by using a token from a deleted session)
  const expiredTokenConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization:
        "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.expired_token",
    },
  };
  await TestValidator.httpError(
    "expired token should get authentication error",
    [401, 403],
    async () => {
      await api.functional.discussionBoard.superAdmin.system_metadata.at(
        expiredTokenConnection,
        {
          metadataId: systemMetadata.id,
        },
      );
    },
  );
  // Test with missing authorization header
  const noAuthConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "missing authorization header should get authentication error",
    [401, 403],
    async () => {
      await api.functional.discussionBoard.superAdmin.system_metadata.at(
        noAuthConnection,
        {
          metadataId: systemMetadata.id,
        },
      );
    },
  );
}
