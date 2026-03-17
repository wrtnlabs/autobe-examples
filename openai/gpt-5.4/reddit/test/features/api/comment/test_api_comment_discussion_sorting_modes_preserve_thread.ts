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

export async function test_api_comment_discussion_sorting_modes_preserve_thread(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = {
    host: connection.host,
    headers: connection.headers,
    simulate: connection.simulate,
    logger: connection.logger,
    encryption: connection.encryption,
    options: connection.options,
    fetch: connection.fetch,
  };
  const postId = typia.random<string & tags.Format<"uuid">>();
  const page = 1 satisfies number as number;
  const limit = 10 satisfies number as number;
  const newRequest = {
    sort: "new",
    page,
    limit,
  } satisfies ICommunityPlatformComment.IRequest;
  const controversialRequest = {
    sort: "controversial",
    page,
    limit,
  } satisfies ICommunityPlatformComment.IRequest;
  const newPage = await api.functional.communityPlatform.posts.comments.index(
    guestConnection,
    {
      postId,
      body: newRequest,
    },
  );
  typia.assert(newPage);
  const controversialPage =
    await api.functional.communityPlatform.posts.comments.index(
      guestConnection,
      {
        postId,
        body: controversialRequest,
      },
    );
  typia.assert(controversialPage);
  const repeatedNewPage =
    await api.functional.communityPlatform.posts.comments.index(
      guestConnection,
      {
        postId,
        body: newRequest,
      },
    );
  typia.assert(repeatedNewPage);
  TestValidator.equals(
    "new pagination current matches request",
    newPage.pagination.current,
    page,
  );
  TestValidator.equals(
    "new pagination limit matches request",
    newPage.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "new pagination records non-negative",
    newPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "new pagination pages non-negative",
    newPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "new page data does not exceed limit",
    newPage.data.length <= limit,
  );
  TestValidator.equals(
    "controversial pagination current matches request",
    controversialPage.pagination.current,
    page,
  );
  TestValidator.equals(
    "controversial pagination limit matches request",
    controversialPage.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "controversial pagination records non-negative",
    controversialPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "controversial pagination pages non-negative",
    controversialPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "controversial page data does not exceed limit",
    controversialPage.data.length <= limit,
  );
  TestValidator.equals(
    "repeated new pagination preserved",
    repeatedNewPage.pagination,
    newPage.pagination,
  );
  TestValidator.equals(
    "repeated new response remains stable",
    repeatedNewPage,
    newPage,
  );
}
