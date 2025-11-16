import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

export async function test_api_post_creation_with_community_code_vs_id(
  connection: api.IConnection,
) {
  // 1. Register a member user and obtain authenticated context
  const joinBody = typia.random<ICommunityPlatformMemberuser.IJoin>();
  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(authorized);

  // 2. Create a community and capture its id and slug
  const communityCreateBody =
    typia.random<ICommunityPlatformCommunity.ICreate>();
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  const communityId: string & tags.Format<"uuid"> = community.id;
  const communityCode: string = community.slug;

  // 3. Create first post, conceptually using communityId (but both fields required)
  const post1CreateBody = {
    communityId,
    communityCode,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 10,
    }),
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post1: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: post1CreateBody,
    });
  typia.assert<ICommunityPlatformPost>(post1);

  TestValidator.equals(
    "post1 community_id matches community.id",
    post1.community_id,
    communityId,
  );

  // 4. Create second post, conceptually emphasizing communityCode resolution
  const post2CreateBody = {
    communityId,
    communityCode,
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 8,
      wordMin: 3,
      wordMax: 10,
    }),
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post2: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: post2CreateBody,
    });
  typia.assert<ICommunityPlatformPost>(post2);

  TestValidator.equals(
    "post2 community_id matches community.id",
    post2.community_id,
    communityId,
  );

  TestValidator.equals(
    "post2 community_id equals post1 community_id",
    post2.community_id,
    post1.community_id,
  );
}
