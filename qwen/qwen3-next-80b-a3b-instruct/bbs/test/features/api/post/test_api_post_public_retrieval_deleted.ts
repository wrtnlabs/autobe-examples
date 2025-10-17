import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdmin";
import type { IEconomicBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardMember";
import type { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";
import type { IEconomicBoardPosts } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPosts";
import type { IEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTopic";

export async function test_api_post_public_retrieval_deleted(
  connection: api.IConnection,
) {
  // Step 1: Create a member account with a randomly generated password hash
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPasswordHash: string = typia.random<string>(); // bcrypt hash string (server-side generated, test accepts any string)
  const member: IEconomicBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password_hash: memberPasswordHash,
      } satisfies IEconomicBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create a topic (Tax Policy)
  const topic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: "Tax Policy",
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topic);

  // Step 3: Create a new post by the member
  const post: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.create(connection, {
      body: {
        economic_board_topics_id: topic.id,
        subject: "Important Economic Analysis",
        content:
          "This is a detailed analysis of current tax policy implications.",
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(post);

  // Step 4: Create an admin account with a randomly generated plain password
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(16);
  const admin: IEconomicBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IEconomicBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // Step 5: Permanently delete the post via admin action
  // The SDK automatically uses the admin's authentication token from join
  await api.functional.admin.posts.erase(connection, {
    postId: post.id,
  });

  // Step 6: Attempt to retrieve the deleted post as unauthenticated user
  // The backend should return 404 Not Found for deleted posts
  await TestValidator.error(
    "deleted post should return 404 Not Found",
    async () => {
      await api.functional.economicBoard.posts.at(connection, {
        postId: post.id,
      });
    },
  );
}
