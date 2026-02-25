import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_posts_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID that does not correspond to any existing member
  const nonExistentMemberId = typia.random<string & tags.Format<"uuid">>();
  // Expect HTTP 404 error when requesting posts for non-existent member
  await TestValidator.httpError(
    "should return 404 for non-existent member",
    404,
    async () =>
      await api.functional.community.members.posts.index(connection, {
        memberId: nonExistentMemberId,
        body: {} satisfies ICommunityPost.IRequest,
      }),
  );
}
