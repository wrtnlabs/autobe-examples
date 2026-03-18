import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_comment_thread_browse_by_post(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  const guest = await api.functional.communityPlatform.auth.guest.join(
    guestConnection,
    { body: {} },
  );
  typia.assert(guest);
  const request = {
    postId: typia.random<string & tags.Format<"uuid">>(),
    sort: "best",
    page: 1,
    limit: 20,
  } satisfies ICommunityPlatformComment.IRequest;
  const output = await api.functional.communityPlatform.guest.comments.index(
    guestConnection,
    { body: request },
  );
  typia.assert(output);
  TestValidator.equals("requested page", output.pagination.current, 1);
  TestValidator.equals("requested limit", output.pagination.limit, 20);
  TestValidator.predicate(
    "records is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "all returned comments belong to requested post",
    output.data.every(
      (comment) => comment.community_platform_post_id === request.postId,
    ),
  );
  TestValidator.predicate(
    "comments are active",
    output.data.every((comment) => comment.deleted_at === null),
  );
  TestValidator.predicate(
    "comments preserve parent_id for threading",
    output.data.every(
      (comment) =>
        comment.parent_id === null || typeof comment.parent_id === "string",
    ),
  );
  TestValidator.predicate(
    "comments include timestamps and content",
    output.data.every(
      (comment) =>
        typeof comment.content === "string" &&
        typeof comment.created_at === "string" &&
        typeof comment.updated_at === "string",
    ),
  );
}
