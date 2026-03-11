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

export async function test_api_system_metadata_deletion_authorization_check(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin account and connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create system metadata record as super admin
  const metadata =
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
  typia.assert(metadata);
  // Test 1: Super admin deletion (should succeed)
  await api.functional.discussionBoard.superAdmin.system_metadata.erase(
    superAdminConnection,
    {
      metadataId: metadata.id,
    },
  );
  // Recreate metadata for subsequent tests
  const metadata2 =
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
  typia.assert(metadata2);
  // Create regular admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test 2: Regular admin deletion (should fail with 403)
  await TestValidator.httpError(
    "regular admin should fail with 403",
    403,
    async () => {
      await api.functional.discussionBoard.superAdmin.system_metadata.erase(
        adminConnection,
        {
          metadataId: metadata2.id,
        },
      );
    },
  );
  // Create regular member account
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
  // Test 3: Regular member deletion (should fail with 403)
  await TestValidator.httpError(
    "regular member should fail with 403",
    403,
    async () => {
      await api.functional.discussionBoard.superAdmin.system_metadata.erase(
        memberConnection,
        {
          metadataId: metadata2.id,
        },
      );
    },
  );
  // Test 4: No authentication deletion (should fail with 401)
  const noAuthConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "no authentication should fail with 401",
    401,
    async () => {
      await api.functional.discussionBoard.superAdmin.system_metadata.erase(
        noAuthConnection,
        {
          metadataId: metadata2.id,
        },
      );
    },
  );
  // Final cleanup by super admin (should succeed)
  await api.functional.discussionBoard.superAdmin.system_metadata.erase(
    superAdminConnection,
    {
      metadataId: metadata2.id,
    },
  );
}
