import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_profile_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create the member connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Create a new member account using utility function
  const member = await authorize_member_join(memberConnection, {
    body: {
      href: `https://test.example.com/${RandomGenerator.alphaNumeric(8)}`,
      referrer: `https://referrer.com/${RandomGenerator.alphaNumeric(8)}`,
      ip: null,
    },
  });
  // Create a discussion board article with proper length
  const title = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 10,
    wordMax: 20,
  });
  const content = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 5,
    sentenceMax: 10,
  });
  TestValidator.predicate(
    "title should be at least 50 characters",
    title.length >= 50,
  );
  TestValidator.predicate(
    "content should be at least 50 characters",
    content.length >= 50,
  );
  // Create the article using utility function
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title,
        content,
      },
    },
  );
  // Retrieve the member's profile
  const memberProfile = await api.functional.discussionBoard.member.members.at(
    memberConnection,
    {
      memberId: member.id,
    },
  );
  // Validate profile information
  typia.assert(memberProfile);
  TestValidator.equals(
    "profile ID should match member ID",
    memberProfile.id,
    member.id,
  );
}
