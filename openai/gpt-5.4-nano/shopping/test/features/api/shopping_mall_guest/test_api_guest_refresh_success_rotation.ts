import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";
export async function test_api_guest_refresh_success_rotation(connection: api.IConnection): Promise<void> {
    const guestJoinConnection: api.IConnection = { host: connection.host };
    const joined = await authorize_guest_join(guestJoinConnection, {
        body: {
            fingerprint: typia.random<string>(),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
        } as unknown as IShoppingMallGuest.IJoin,
    });
    typia.assert(joined);
    const refreshedConnection: api.IConnection = { host: connection.host };
    const refreshed = await authorize_guest_refresh(refreshedConnection, {
        body: {},
    });
    typia.assert(refreshed);
    // 1) Response should represent an active guest session
    TestValidator.equals("session not soft-deleted", refreshed.deleted_at, null);
    // 2) Token rotation / renewal
    TestValidator.notEquals("access token rotated", refreshed.token.access, joined.token.access);
    // 3) Expiry metadata should move forward
    TestValidator.predicate("expired_at extended", new Date(refreshed.expired_at).getTime() >=
        new Date(joined.expired_at).getTime());
    TestValidator.predicate("updated_at is monotonic", new Date(refreshed.updated_at).getTime() >=
        new Date(joined.updated_at).getTime());
}
