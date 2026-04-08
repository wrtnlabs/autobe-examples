import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunitySnapshot";
import type { IRedditPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySnapshot";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

const randomPassword = RandomGenerator.alphaNumeric(16);
const randomUsername = RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3);

export async function test_api_community_snapshot_list(connection: api.IConnection): Promise<void> {
    // Step 1: Create and authenticate member using utility function
    const memberConnection: api.IConnection = { host: connection.host };
    const memberAuth: IRedditPlatformMember.IAuthorized = await authorize_member_join(memberConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: randomPassword,
            username: randomUsername,
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IRedditPlatformMember.IJoin,
    });
    typia.assert(memberAuth);
    // Step 2: Create authenticated connection for snapshots API
    const snapshotConnection: api.IConnection = { host: connection.host };
    await authorize_member_login(snapshotConnection, {
        body: {
            email: memberAuth.email,
            password: randomPassword,
        } satisfies IRedditPlatformMember.ILogin,
    });
    // Step 3: Generate community name and request parameters
    const communityName = RandomGenerator.alphaNumeric(12);
    const paginationRequest = {
        page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        limit: typia.random<number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>>(),
        sort: RandomGenerator.pick(["newest", "oldest"] as const),
        direction: RandomGenerator.pick(["asc", "desc"] as const),
    } satisfies IRedditPlatformCommunitySnapshot.IRequest;
    // Step 4: Call the snapshots endpoint
    const snapshotResponse: IPageIRedditPlatformCommunitySnapshot.ISummary = await api.functional.redditPlatform.communities.snapshots.index(snapshotConnection, {
        name: communityName,
        body: paginationRequest,
    });
    typia.assert(snapshotResponse);
    // Step 5: Validate pagination metadata
    TestValidator.equals("pagination current", snapshotResponse.pagination.current, paginationRequest.page ?? 1);
    TestValidator.equals("pagination limit", snapshotResponse.pagination.limit, paginationRequest.limit ?? 20);
    TestValidator.equals("pagination records non-negative", snapshotResponse.pagination.records >= 0, true);
    TestValidator.equals("pagination pages non-negative", snapshotResponse.pagination.pages >= 0, true);
    // Step 6: Validate snapshot records structure
    if (snapshotResponse.data.length > 0) {
        const firstSnapshot = snapshotResponse.data[0];
        TestValidator.equals("snapshot has id", firstSnapshot.id !== undefined, true);
        TestValidator.equals("snapshot has name", firstSnapshot.name !== undefined, true);
        TestValidator.equals("snapshot has description", firstSnapshot.description !== undefined, true);
        TestValidator.equals("snapshot has icon_url", firstSnapshot.icon_url !== undefined, true);
        TestValidator.equals("snapshot has created_at", firstSnapshot.created_at !== undefined, true);
    }
    // Step 7: Validate snapshots are sorted by newest first (default)
    if (snapshotResponse.data.length >= 2) {
        for (let i = 1; i < snapshotResponse.data.length; i++) {
            TestValidator.predicate(`snapshot ${i} is older than ${i - 1}`, snapshotResponse.data[i].created_at <= snapshotResponse.data[i - 1].created_at);
        }
    }
}

// Helper functions for authorization
async function authorize_member_join(connection: api.IConnection, props: {
    body?: Partial<IRedditPlatformMember.IJoin>;
}): Promise<IRedditPlatformMember.IAuthorized> {
    const joinInput = {
        email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
        password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
        username: props.body?.username ??
            RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
        href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
        referrer: props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
        ip: props.body?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin;
    return await api.functional.redditPlatform.auth.member.join(connection, {
        body: joinInput,
    });
}

async function authorize_member_login(connection: api.IConnection, props: {
    body: IRedditPlatformMember.ILogin;
}): Promise<IRedditPlatformMember.IAuthorized> {
    return await api.functional.redditPlatform.auth.member.login(connection, {
        body: props.body,
    });
}