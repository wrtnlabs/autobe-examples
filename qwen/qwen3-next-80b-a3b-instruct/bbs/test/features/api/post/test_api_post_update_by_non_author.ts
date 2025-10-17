import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardMember";
import type { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";
import type { IEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTopic";

export async function test_api_post_update_by_non_author(
  connection: api.IConnection,
) {
  // 1. Authenticate first member to create a post
  const member1Email: string = typia.random<string & tags.Format<"email">>();
  const member1: IEconomicBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member1Email,
        password_hash: "hashed_password_1",
      } satisfies IEconomicBoardMember.ICreate,
    });
  typia.assert(member1);

  // 2. Ensure valid topic exists for post creation
  const topic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: "Inflation",
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topic);

  // 3. First member creates a post
  const post: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.create(connection, {
      body: {
        economic_board_topics_id: topic.id,
        subject: "Test subject about inflation",
        content: "This is a test post about economic inflation.",
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(post);

  // 4. Authenticate second member to attempt unauthorized update
  const member2Email: string = typia.random<string & tags.Format<"email">>();
  const member2: IEconomicBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member2Email,
        password_hash: "hashed_password_2",
      } satisfies IEconomicBoardMember.ICreate,
    });
  typia.assert(member2);

  // 5. Second member attempts to update first member's post (should fail with 403)
  await TestValidator.error("non-author cannot update post", async () => {
    await api.functional.economicBoard.member.posts.update(connection, {
      postId: post.id,
      body: {
        subject: "Hacked subject",
        content: "Hacked content",
      } satisfies IEconomicBoardPost.IUpdate,
    });
  });
}
