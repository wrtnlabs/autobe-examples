import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdmin";
import type { IEconomicBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardMember";
import type { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";
import type { IEconomicBoardPosts } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPosts";
import type { IEconomicBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardReply";
import type { IEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTopic";

export async function test_api_member_reply_update_within_window(
  connection: api.IConnection,
) {
  // Step 1: Create a member account with valid bcrypt-style password hash
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  // Use a sample bcrypt hash format (60 characters, starts with $2a$, $2b$, or $2y$)
  const memberPasswordHash: string =
    "$2a$10$nOUIs5B58Y4PjtkRjh4D1ul5q.Z8F4XpZbZK5wWm3c.W4D47.hx3m";
  const member: IEconomicBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password_hash: memberPasswordHash,
      } satisfies IEconomicBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create a topic 'Labor Markets'
  const topic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: "Labor Markets",
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topic);

  // Step 3: Create a new post with the topic
  const post: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.create(connection, {
      body: {
        economic_board_topics_id: topic.id,
        subject: "Discussion on Wage Growth",
        content:
          "Recent data shows wage growth is outpacing inflation in the service sector. This has significant implications for consumer spending patterns.",
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(post);

  // Step 4: Switch to admin account and approve the post
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = "adminPassword123";
  const admin: IEconomicBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IEconomicBoardAdmin.IJoin,
    });
  typia.assert(admin);

  await api.functional.admin.posts.approve(connection, {
    postId: post.id,
  });

  // Step 5: Create a reply to the approved post
  const reply: IEconomicBoardReply =
    await api.functional.economicBoard.member.posts.replies.create(connection, {
      postId: post.id,
      body: {
        content:
          "I agree with this analysis. Wage growth needs to be sustainable to avoid overheating the economy.",
      } satisfies IEconomicBoardReply.ICreate,
    });
  typia.assert(reply);

  // Step 6: Update the reply within the 24-hour window
  const updatedReply: IEconomicBoardReply =
    await api.functional.economicBoard.member.posts.replies.update(connection, {
      postId: post.id,
      replyId: reply.id,
      body: {
        content:
          "I agree with this analysis. Wage growth needs to be sustainable to avoid overheating the economy, especially with current inflation pressures.",
      } satisfies IEconomicBoardReply.IUpdate,
    });
  typia.assert(updatedReply);

  // Step 7: Validate the update: edited flag should be true, updated_at should be set, original created_at should be unchanged
  TestValidator.equals(
    "reply should be marked as edited",
    updatedReply.edited,
    true,
  );
  TestValidator.equals(
    "created_at should remain unchanged",
    updatedReply.created_at,
    reply.created_at,
  );
}
