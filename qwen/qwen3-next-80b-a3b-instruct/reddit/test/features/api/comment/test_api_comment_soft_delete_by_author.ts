import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBBSCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCitizen";
import type { ICommunityBBSCitizenICreate } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCitizenICreate";
import type { ICommunityBBSComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSComment";
import type { ICommunityBBSCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCommunity";
import type { ICommunityBBSPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSPost";

export async function test_api_comment_soft_delete_by_author(
  connection: api.IConnection,
) {
  const citizen = await api.functional.auth.citizen.join(connection, {
    body: typia.random<ICommunityBBSCitizenICreate>(),
  });
  typia.assert(citizen);

  const post = await api.functional.communityBBS.citizen.posts.create(
    connection,
    { body: typia.random<ICommunityBBSPost.ICreate>() },
  );
  typia.assert(post);

  const comment = await api.functional.communityBBS.citizen.comments.create(
    connection,
    {
      body: {
        post_id: post.id,
        body: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies ICommunityBBSComment.ICreate,
    },
  );
  typia.assert(comment);

  // Soft-delete the comment - this is the only operation we can perform and validate
  await api.functional.communityBBS.citizen.comments.erase(connection, {
    commentId: comment.id,
  });
}
