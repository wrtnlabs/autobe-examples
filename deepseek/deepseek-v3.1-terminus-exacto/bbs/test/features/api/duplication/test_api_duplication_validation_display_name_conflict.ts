import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_duplication_validation_display_name_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin account for duplication validation access
  const superAdminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  // 2. Create member account with specific display name
  const memberConnection: api.IConnection = { host: connection.host };
  const displayName = RandomGenerator.name();
  await api.functional.discussionBoard.auth.member.join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: displayName,
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // 3. Test duplication validation with existing display name
  const duplicateCheck =
    await api.functional.discussionBoard.superAdmin.duplication.validate(
      superAdminConnection,
      {
        body: {
          search: displayName,
        } satisfies IDiscussionBoardArticleTag.IRequest,
      },
    );
  typia.assert(duplicateCheck);
  // 4. Validate duplicate detection
  TestValidator.equals(
    "should detect duplicate display name",
    duplicateCheck.isDuplicate,
    true,
  );
  TestValidator.equals(
    "duplicate type should be display_name",
    duplicateCheck.duplicateType,
    "display_name",
  );
  TestValidator.predicate(
    "should provide suggestions",
    Array.isArray(duplicateCheck.suggestions) &&
      duplicateCheck.suggestions.length > 0,
  );
  // 5. Test case-insensitive matching with different case variation
  const caseVariation = displayName.toUpperCase();
  const caseInsensitiveCheck =
    await api.functional.discussionBoard.superAdmin.duplication.validate(
      superAdminConnection,
      {
        body: {
          search: caseVariation,
        } satisfies IDiscussionBoardArticleTag.IRequest,
      },
    );
  typia.assert(caseInsensitiveCheck);
  // Case-insensitive duplicate should still be detected
  TestValidator.equals(
    "case-insensitive duplicate detection",
    caseInsensitiveCheck.isDuplicate,
    true,
  );
  TestValidator.equals(
    "case-insensitive duplicate type",
    caseInsensitiveCheck.duplicateType,
    "display_name",
  );
  // 6. Test non-duplicate display name
  const uniqueDisplayName = RandomGenerator.name() + "_unique";
  const uniqueCheck =
    await api.functional.discussionBoard.superAdmin.duplication.validate(
      superAdminConnection,
      {
        body: {
          search: uniqueDisplayName,
        } satisfies IDiscussionBoardArticleTag.IRequest,
      },
    );
  typia.assert(uniqueCheck);
  // Should not detect duplicate for unique name
  TestValidator.equals(
    "should not detect duplicate for unique name",
    uniqueCheck.isDuplicate,
    false,
  );
  TestValidator.equals(
    "duplicate type should be undefined for unique name",
    uniqueCheck.duplicateType,
    undefined,
  );
}
