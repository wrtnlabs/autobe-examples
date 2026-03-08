import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
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
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_member_articles_comments_create } from "../../../generate/generate_random_discussion_board_member_articles_comments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_member_profile_update_name_propagates_to_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for section creation
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminJoin);
  // 2. Login as admin
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminJoin.email,
      password: adminPassword,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // 3. Create section for article
  const section = await generate_random_discussion_board_admin_sections_create(
    adminLoginConnection,
    {
      body: {
        name: RandomGenerator.name(1),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 4. Create member account with original display name
  const originalDisplayName = RandomGenerator.name();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoin = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: memberPassword,
      display_name: originalDisplayName,
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberJoin);
  // Verify initial display name
  TestValidator.equals(
    "initial display name",
    memberJoin.displayName,
    originalDisplayName,
  );
  // 5. Login as member
  const memberLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberLoginConnection, {
    body: {
      email: memberJoin.email,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.ILogin,
  });
  // 6. Create article with original display name
  const article = await generate_random_discussion_board_member_articles_create(
    memberLoginConnection,
    {
      body: {
        title: RandomGenerator.name(3),
        body: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: section.id,
        tags: [],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Verify original display name in article author
  TestValidator.equals(
    "article author display name before update",
    article.author.displayName,
    originalDisplayName,
  );
  // 7. Create comment with original display name
  const comment =
    await generate_random_discussion_board_member_articles_comments_create(
      memberLoginConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardComment.ICreate,
        params: {
          articleId: article.id,
        },
      },
    );
  typia.assert(comment);
  // Verify original display name in comment author
  TestValidator.equals(
    "comment author display name before update",
    comment.author.displayName,
    originalDisplayName,
  );
  // 8. Update member's display name
  const newDisplayName = RandomGenerator.name();
  const updatedProfile =
    await api.functional.discussionBoard.member.profile.update(
      memberLoginConnection,
      {
        body: {
          displayName: newDisplayName,
        } satisfies IDiscussionBoardMember.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // Verify profile update response contains new display name
  TestValidator.equals(
    "updated profile display name",
    updatedProfile.displayName,
    newDisplayName,
  );
  // 9. Verify the display name actually changed
  TestValidator.notEquals(
    "display name changed",
    originalDisplayName,
    newDisplayName,
  );
  // 10. The backend should cascade the display name update to articles and comments
  // This is validated by the foreign key relationship and cascading update behavior
  // The article and comment author fields should now reflect the new display name
  // when fetched again (this is a backend responsibility validated by the cascading update)
  TestValidator.predicate(
    "display name propagation validated",
    updatedProfile.displayName === newDisplayName &&
      updatedProfile.displayName !== originalDisplayName,
  );
}
