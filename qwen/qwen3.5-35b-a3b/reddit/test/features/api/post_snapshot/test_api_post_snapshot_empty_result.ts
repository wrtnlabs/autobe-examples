import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPostSnapshot";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostSnapshot";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
/**
 * Test that authenticated members receive proper empty response when no post snapshots exist.
 *
 * Validates the complete flow of member authentication and post snapshot querying for a fresh account with no post history. The test ensures that the endpoint handles the edge case of zero snapshots gracefully, returning proper pagination structure with empty data.
 *
 * Special attention is given to verifying that the pagination metadata remains valid (current, limit, records, pages) even when no snapshots exist, confirming the API properly handles empty state conditions.
 *
 * 1. Fresh member account creation with randomized email, username, and password.
 * 2. Member authentication via authorize_member_join utility function.
 * 3. Query post snapshots endpoint with default pagination (no filters, no sorting).
 * 4. Validate pagination metadata shows correct empty state (records: 0, pages: 0).
 * 5. Validate data array is empty [] with no snapshots returned.
 */
export async function test_api_post_snapshot_empty_result(connection: api.IConnection): Promise<void> {
    // 1. Create fresh member account without any posts
    const memberConnection: api.IConnection = { host: connection.host };
    const member = await authorize_member_join(memberConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "12345678",
            username: RandomGenerator.alphabets(8) + "_" + RandomGenerator.alphabets(3),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditPlatformMember.IJoin,
    });
    typia.assert(member);
    // 2. Query post snapshots endpoint with default pagination
    const snapshotConnection: api.IConnection = { host: connection.host };
    const response = await api.functional.redditPlatform.member.post_snapshots.index(snapshotConnection, {
        body: {} satisfies IRedditPlatformPostSnapshot.IRequest,
    });
    typia.assert(response);
    // 3. Validate empty state pagination metadata
    TestValidator.equals("pagination current", response.pagination.current, 1);
    TestValidator.equals("pagination limit", response.pagination.limit, 20);
    TestValidator.equals("pagination records", response.pagination.records, 0);
    TestValidator.equals("pagination pages", response.pagination.pages, 0);
    // 4. Validate data array is empty
    TestValidator.equals("data array empty", response.data, []);
}