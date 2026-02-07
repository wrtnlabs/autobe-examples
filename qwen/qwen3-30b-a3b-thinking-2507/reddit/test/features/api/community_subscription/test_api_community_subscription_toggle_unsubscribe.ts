import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_community_subscription_toggle_unsubscribe(connection: api.IConnection) {
    const memberConnection: api.IConnection = { host: connection.host };
    await authorize_member_join(memberConnection, {
        body: typia.random<ICommunityPlatformMember.IJoin>(),
    });
    const communityId = typia.random<string & tags.Format<"uuid">>();
    const subscription = await api.functional.communityPlatform.member.communities.subscriptions.create(memberConnection, {
        communityId,
    });
    typia.assert(subscription);
    const result = await api.functional.communityPlatform.member.communities.subscriptions.toggle(memberConnection, {
        communityId,
        body: { subscribed: false },
    });
    typia.assert(result);
    TestValidator.equals("Subscription should be soft-deleted", result.deleted_at !== null, true);
}