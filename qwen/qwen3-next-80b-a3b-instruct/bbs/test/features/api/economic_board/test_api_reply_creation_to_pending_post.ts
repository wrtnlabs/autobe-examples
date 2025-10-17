import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardMember";
import type { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";
import type { IEconomicBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardReply";
import type { IEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTopic";

export async function test_api_reply_creation_to_pending_post(
  connection: api.IConnection,
) {
  // 1. Authenticate member to create reply
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IEconomicBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password_hash: typia.random<string>(),
      } satisfies IEconomicBoardMember.ICreate,
    });
  typia.assert(member);

  // 2. Create a predefined topic for post creation using exact system values
  const topics: (
    | "Inflation"
    | "Tax Policy"
    | "Elections"
    | "Global Trade"
    | "Monetary Policy"
    | "Labor Markets"
    | "Fiscal Policy"
  )[] = [
    "Inflation",
    "Tax Policy",
    "Elections",
    "Global Trade",
    "Monetary Policy",
    "Labor Markets",
    "Fiscal Policy",
  ] as const;
  const topicName:
    | "Inflation"
    | "Tax Policy"
    | "Elections"
    | "Global Trade"
    | "Monetary Policy"
    | "Labor Markets"
    | "Fiscal Policy" = RandomGenerator.pick(topics);
  const topic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: topicName,
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topic);

  // 3. Create a pending post (not yet published) by the authenticated member
  const post: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.create(connection, {
      body: {
        economic_board_topics_id: topic.id,
        subject: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 20,
          wordMin: 4,
          wordMax: 8,
        }),
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(post);

  // 4. Create a reply to the pending post
  const reply: IEconomicBoardReply =
    await api.functional.economicBoard.member.posts.replies.create(connection, {
      postId: post.id,
      body: {
        content: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies IEconomicBoardReply.ICreate,
    });
  typia.assert(reply);

  // 5. Validate reply properties
  TestValidator.predicate(
    "reply content length is within bounds",
    reply.content.length >= 5 && reply.content.length <= 1000,
  );
  TestValidator.equals("reply should not be edited", reply.edited, false);
}
