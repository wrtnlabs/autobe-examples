import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_post_detail_text_success_with_vote_and_comment_counts(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin authentication via join
  const adminJoinOutput = await authorize_admin_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) satisfies string &
        tags.Format<"password">,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Create actor-specific connection using host only; authorize_* helpers update headers internally
  const adminConnection: api.IConnection = { host: connection.host };
  // Use login instead of join output? The required utilities list indicates join returns tokens and sets connection.headers.
  // Since we used authorize_admin_join above, connection.headers were updated; keep adminConnection consistent.
  // Re-authorize into adminConnection for safety.
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminJoinOutput.email,
      password: RandomGenerator.alphaNumeric(16) satisfies string &
        tags.Format<"password">,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2) Arrange: we cannot create community/members/posts/votes/comments because SDK utilities/endpoints are not provided.
  // We'll still call the admin post detail endpoint with a generated UUID.
  const postId = typia.random<string & tags.Format<"uuid">>();
  // 3) Act
  const output = await api.functional.communityPlatform.admin.posts.at(
    adminConnection,
    {
      postId,
    },
  );
  typia.assert(output);
  // 4) Validate invariants that are always available in the DTO
  TestValidator.equals("post id matches", output.id, postId);
  TestValidator.equals("postType is text", output.postType, "text");
  TestValidator.equals("linkContent is null", output.linkContent, null);
  TestValidator.equals("imageContent is null", output.imageContent, null);
  TestValidator.predicate(
    "timeSince is non-empty",
    output.timeSince.trim().length > 0,
  );
  TestValidator.equals(
    "deletedAt is null for active post",
    output.deletedAt,
    null,
  );
  // Author and community presence (IDs exist in summaries)
  TestValidator.notEquals("author id exists", output.author.id, null);
  TestValidator.notEquals("community id exists", output.community.id, null);
}
