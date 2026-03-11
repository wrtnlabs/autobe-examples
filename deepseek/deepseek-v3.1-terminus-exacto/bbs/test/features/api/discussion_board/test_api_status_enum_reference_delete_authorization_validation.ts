import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnum";
import type { IDiscussionBoardStatusEnumReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnumReference";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
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
import { generate_random_discussion_board_super_admin_status_enums_create } from "../../../generate/generate_random_discussion_board_super_admin_status_enums_create";
import { generate_random_discussion_board_super_admin_status_enums_references_create } from "../../../generate/generate_random_discussion_board_super_admin_status_enums_references_create";
import { prepare_random_discussion_board_status_enum } from "../../../prepare/prepare_random_discussion_board_status_enum";
import { prepare_random_discussion_board_status_enum_reference } from "../../../prepare/prepare_random_discussion_board_status_enum_reference";

export async function test_api_status_enum_reference_delete_authorization_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth =
    await api.functional.discussionBoard.auth.superAdmin.join(
      superAdminConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(16),
        } satisfies IDiscussionBoardSuperAdmin.IJoin,
      },
    );
  typia.assert(superAdminAuth);
  superAdminConnection.headers = { Authorization: superAdminAuth.token.access };
  // 2. Create a status enumeration as super admin
  const statusEnum =
    await api.functional.discussionBoard.superAdmin.status_enums.create(
      superAdminConnection,
      {
        body: {
          entity_type: "article",
          value: "draft",
          description: "Article is in draft status",
          sort_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IDiscussionBoardStatusEnum.ICreate,
      },
    );
  typia.assert(statusEnum);
  // 3. Create a reference relationship for the status enumeration
  const reference =
    await api.functional.discussionBoard.superAdmin.status_enums.references.create(
      superAdminConnection,
      {
        statusEnumId: statusEnum.id,
        body: {
          referenced_table: "discussion_board_articles",
          referenced_column: "status",
        } satisfies IDiscussionBoardStatusEnumReference.ICreate,
      },
    );
  typia.assert(reference);
  // 4. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await api.functional.discussionBoard.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardMember.IJoin,
    },
  );
  typia.assert(memberAuth);
  memberConnection.headers = { Authorization: memberAuth.token.access };
  // 5. Create regular admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await api.functional.discussionBoard.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IDiscussionBoardAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  adminConnection.headers = { Authorization: adminAuth.token.access };
  // 6. Attempt deletion with member connection - expect authorization error
  await TestValidator.error(
    "member should not be able to delete status enum reference",
    async () => {
      await api.functional.discussionBoard.superAdmin.status_enums.references.erase(
        memberConnection,
        {
          statusEnumId: statusEnum.id,
          referenceId: reference.id,
        },
      );
    },
  );
  // 7. Attempt deletion with regular admin connection - expect authorization error
  await TestValidator.error(
    "regular admin should not be able to delete status enum reference",
    async () => {
      await api.functional.discussionBoard.superAdmin.status_enums.references.erase(
        adminConnection,
        {
          statusEnumId: statusEnum.id,
          referenceId: reference.id,
        },
      );
    },
  );
  // 8. Successfully delete with super admin connection
  await api.functional.discussionBoard.superAdmin.status_enums.references.erase(
    superAdminConnection,
    {
      statusEnumId: statusEnum.id,
      referenceId: reference.id,
    },
  );
  // 9. Verify deletion by attempting to delete again (should fail with not found)
  await TestValidator.error(
    "reference should be deleted and no longer exist",
    async () => {
      await api.functional.discussionBoard.superAdmin.status_enums.references.erase(
        superAdminConnection,
        {
          statusEnumId: statusEnum.id,
          referenceId: reference.id,
        },
      );
    },
  );
}
