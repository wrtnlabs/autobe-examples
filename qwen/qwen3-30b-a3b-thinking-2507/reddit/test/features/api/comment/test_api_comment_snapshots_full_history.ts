import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditProfileSnapshot";
import type { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import type { IRedditProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditProfileSnapshot";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
/**
 * Moderators verify complete comment history by retrieving all snapshots of a commented post.
 * The system must show original content, subsequent edits with timestamped changes, and author information
 * without relying on current data, enabling full audit trail verification for content governance.
 */
export async function test_api_comment_snapshots_full_history(connection: api.IConnection): Promise<void> {
    // 1. Register new member and authenticate
    const memberConnection: api.IConnection = { host: connection.host };
    await authorize_member_join(memberConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "testpass123",
            username: RandomGenerator.name(),
        } satisfies IRedditMember.IJoin
    });
    // 2. Request full comment snapshots history
    const response = await api.functional.reddit.member.snapshots.index(memberConnection, {
        body: {
            reddit_comment_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IRedditProfileSnapshot.IRequest
    });
    typia.assert(response);
    // 3. Validate response structure and content
    TestValidator.equals("response contains data array", Array.isArray(response.data), true);
    TestValidator.predicate("at least one snapshot returned", response.data.length > 0);
    // Verify all snapshots have required properties
    response.data.forEach(snapshot => {
        TestValidator.equals("snapshot has content", typeof snapshot.content, "string");
        TestValidator.equals("snapshot has valid post_id", typeof snapshot.post_id === "string" && snapshot.post_id.length > 0, true);
        TestValidator.equals("snapshot has valid author_id", typeof snapshot.author_id === "string" && snapshot.author_id.length > 0, true);
        TestValidator.equals("snapshot has valid timestamps", typeof snapshot.created_at === "string" && snapshot.created_at.length > 0, true);
    });
}