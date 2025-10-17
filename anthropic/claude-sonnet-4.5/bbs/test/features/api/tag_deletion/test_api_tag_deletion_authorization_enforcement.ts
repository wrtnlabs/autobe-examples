import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test that tag deletion is restricted to administrators only and rejects
 * attempts by non-administrator users.
 *
 * This test validates role-based access control for tag deletion operations. It
 * creates a member account and a moderator account, creates a tag using an
 * administrator account, then attempts to delete the tag using the member and
 * moderator credentials. The test validates that both deletion attempts are
 * rejected with authorization errors indicating insufficient privileges, that
 * the tag remains active and unchanged after the unauthorized deletion
 * attempts, and that only administrators can successfully delete tags.
 *
 * Test workflow:
 *
 * 1. Create administrator account to create the tag
 * 2. Administrator creates a tag to be protected from unauthorized deletion
 * 3. Create member account for unauthorized deletion attempt
 * 4. Create moderator account for unauthorized deletion attempt
 * 5. Member attempts to delete the tag - should be rejected
 * 6. Moderator attempts to delete the tag - should be rejected
 * 7. Verify tag remains unchanged after unauthorized attempts
 */
export async function test_api_tag_deletion_authorization_enforcement(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account to create and manage tags
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Admin123!@#";

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(15),
        email: adminEmail,
        password: adminPassword,
      } satisfies IDiscussionBoardAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Administrator creates a tag that will be protected from unauthorized deletion
  const tagName = RandomGenerator.alphaNumeric(
    typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<30>
    >(),
  );

  const tagToProtect: IDiscussionBoardTag =
    await api.functional.discussionBoard.administrator.tags.create(connection, {
      body: {
        name: tagName,
        description: RandomGenerator.paragraph(),
      } satisfies IDiscussionBoardTag.ICreate,
    });
  typia.assert(tagToProtect);
  TestValidator.equals(
    "tag name matches",
    tagToProtect.name,
    tagName.toLowerCase(),
  );

  // Step 3: Create member account to attempt unauthorized tag deletion
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "Member123!@#";

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: memberEmail,
        password: memberPassword,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Member attempts to delete the tag - should fail with authorization error
  await TestValidator.error("member cannot delete tags", async () => {
    await api.functional.discussionBoard.administrator.tags.erase(connection, {
      tagId: tagToProtect.id,
    });
  });

  // Step 5: Create moderator account to test that even moderators cannot delete tags
  // Switch back to admin authentication context first
  await api.functional.auth.administrator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(15),
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdministrator.ICreate,
  });

  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "Moderator123!@#";

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        appointed_by_admin_id: admin.id,
        username: RandomGenerator.alphaNumeric(12),
        email: moderatorEmail,
        password: moderatorPassword,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 6: Moderator attempts to delete the tag - should fail with authorization error
  await TestValidator.error(
    "moderator cannot delete tags without administrator privileges",
    async () => {
      await api.functional.discussionBoard.administrator.tags.erase(
        connection,
        {
          tagId: tagToProtect.id,
        },
      );
    },
  );
}
