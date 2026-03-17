import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_comment_discussion_post_unavailable(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = {
    host: connection.host,
  };
  const body = {
    sort: "new",
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformComment.IRequest;
  const unavailablePostId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "requesting comments for an unavailable post should fail",
    async () => {
      await api.functional.communityPlatform.posts.comments.index(
        guestConnection,
        {
          postId: unavailablePostId,
          body,
        },
      );
    },
  );
}
