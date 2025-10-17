import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardMember";
import type { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";
import type { IEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTopic";

export async function test_api_post_creation_by_member_with_empty_subject(
  connection: api.IConnection,
) {
  // Authenticate member to submit post
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IEconomicBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password_hash: typia.random<string>(),
      } satisfies IEconomicBoardMember.ICreate,
    });
  typia.assert(member);

  // Ensure a valid active topic exists
  const topicName = typia.random<
    | "Inflation"
    | "Tax Policy"
    | "Elections"
    | "Global Trade"
    | "Monetary Policy"
    | "Labor Markets"
    | "Fiscal Policy"
  >();
  const topic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: topicName,
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topic);
  TestValidator.predicate("topic is active", topic.is_active === true);

  // Attempt to create a post with empty subject (should fail)
  await TestValidator.error(
    "post creation should fail with empty subject",
    async () => {
      await api.functional.economicBoard.member.posts.create(connection, {
        body: {
          economic_board_topics_id: topic.id,
          subject: "", // Empty subject violates 5-120 char constraint
          content: "This is a test content with sufficient length.",
        } satisfies IEconomicBoardPost.ICreate,
      });
    },
  );
}
