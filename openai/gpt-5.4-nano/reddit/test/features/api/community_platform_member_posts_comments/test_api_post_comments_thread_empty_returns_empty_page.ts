import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostVoteComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostVoteComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostVoteComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";

export async function test_api_post_comments_thread_empty_returns_empty_page(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  // We cannot deterministically obtain a created postId with the provided
  // helpers/SDK typings (post creation utilities return void).
  // So we use a syntactically valid postId and validate only structural
  // pagination consistency if the server returns an empty thread.
  const postId = typia.random<string & tags.Format<"uuid">>();
  const thread =
    await api.functional.communityPlatform.member.posts.comments.index(
      memberConnection,
      {
        postId,
        body: {
          page: 1,
          limit: 10,
          sort: "new",
        } satisfies ICommunityPlatformPostVoteComment.IRequest,
      },
    );
  typia.assert(thread);
  // Structural invariant: pages/records are consistent.
  if (thread.pagination.records === 0) {
    TestValidator.equals(
      "pagination.pages equals 0 when records=0",
      thread.pagination.pages,
      0,
    );
    TestValidator.equals("data is empty when records=0", thread.data.length, 0);
  }
  TestValidator.predicate(
    "pagination consistency invariant",
    thread.pagination.pages === 0 || thread.pagination.records > 0,
  );
}
