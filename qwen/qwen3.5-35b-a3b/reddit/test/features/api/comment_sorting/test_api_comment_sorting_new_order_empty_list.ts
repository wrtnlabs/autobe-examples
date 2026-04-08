import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformComment";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_comment_sorting_new_order_empty_list(connection: api.IConnection): Promise<void> {
    const guestConnection: api.IConnection = { host: connection.host };
    await authorize_guest_join(guestConnection, {
        body: {
            fingerprint: typia.random<string>(),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        },
    });
    const postId: string & tags.Format<"uuid"> = typia.random<string & tags.Format<"uuid">>();
    const requestBody: IRedditPlatformComment.ISortRequest = {
        sort: "new",
    } satisfies IRedditPlatformComment.ISortRequest;
    let output: IPageIRedditPlatformComment.ISummary;
    try {
        output = await api.functional.redditPlatform.guest.posts.comments.sort(guestConnection, {
            postId,
            body: requestBody,
        });
        typia.assert(output);
    }
    catch (exp) {
        if ((exp as any).statusCode === 404) {
            await TestValidator.httpError("post not found returns 404", 404, async () => {
                throw exp;
            });
            return;
        }
        throw exp;
    }
    TestValidator.equals("data is empty", output.data.length, 0);
    TestValidator.equals("current page is 1", output.pagination.current, 1);
    TestValidator.equals("limit is 20", output.pagination.limit, 20);
    TestValidator.equals("records count is 0", output.pagination.records, 0);
    TestValidator.equals("pages count is 0", output.pagination.pages, 0);
}