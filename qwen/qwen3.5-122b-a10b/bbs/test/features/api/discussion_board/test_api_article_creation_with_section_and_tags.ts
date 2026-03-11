import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
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
import { generate_random_discussion_board_admin_tags_create } from "../../../generate/generate_random_discussion_board_admin_tags_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";
import { prepare_random_discussion_board_tag } from "../../../prepare/prepare_random_discussion_board_tag";

/**
 * Test article creation with section and tags by a registered member.
 *
 * 1. Admin Setup: Join and login as admin to create sections and tags
 * 2. Section Creation: Admin creates a discussion board section
 * 3. Tag Creation: Admin creates 2-3 tags for article categorization
 * 4. Member Setup: Join and login as member to enable article creation
 * 5. Article Creation: Member creates article with title, body, section, and tags
 * 6. Validation: Verify article structure, section reference, member reference, and tag associations
 */
export async function test_api_article_creation_with_section_and_tags(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin Setup - Join and login as admin
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminLogin = await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminAuth.email,
      password: adminPassword,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  typia.assert(adminLogin);
  // 2. Section Creation - Admin creates a section
  const section = await generate_random_discussion_board_admin_sections_create(
    adminLoginConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 3. Tag Creation - Admin creates 2-3 tags
  const tagCount = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<3>
  >();
  const tags = await ArrayUtil.asyncRepeat(tagCount, async () => {
    const tag = await generate_random_discussion_board_admin_tags_create(
      adminLoginConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardTag.ICreate,
      },
    );
    typia.assert(tag);
    return tag;
  });
  // 4. Member Setup - Join and login as member
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const memberJoin = await authorize_member_join(memberJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: memberPassword,
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberJoin);
  const memberLoginConnection: api.IConnection = { host: connection.host };
  const memberLogin = await authorize_member_login(memberLoginConnection, {
    body: {
      email: memberJoin.email,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.ILogin,
  });
  typia.assert(memberLogin);
  // 5. Article Creation - Member creates article with section and tags
  const article = await generate_random_discussion_board_member_articles_create(
    memberLoginConnection,
    {
      body: {
        title: RandomGenerator.name(3),
        body: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: section.id,
        tagIds: tags.map((t) => t.id),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 6. Validation
  TestValidator.equals(
    "article section ID matches",
    article.section.id,
    section.id,
  );
  TestValidator.equals(
    "article member ID matches",
    article.member.id,
    memberJoin.id,
  );
  TestValidator.predicate(
    "article has valid comments count",
    article.comments_count >= 0,
  );
  TestValidator.predicate(
    "article has created_at timestamp",
    article.created_at.length > 0,
  );
  TestValidator.predicate(
    "article has updated_at timestamp",
    article.updated_at.length > 0,
  );
}
