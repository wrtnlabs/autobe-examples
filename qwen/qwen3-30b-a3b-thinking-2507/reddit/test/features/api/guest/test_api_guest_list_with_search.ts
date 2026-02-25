import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditGuest";
import type { IRedditGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditGuest";
import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";
export async function test_api_guest_list_with_search(connection: api.IConnection): Promise<void> {
    // 1. Generate device_id
    const randomDeviceId = typia.random<string & tags.Format<"uuid">>();
    // 2. Create guest connection and authenticate
    const guestConnection: api.IConnection = { host: connection.host };
    await authorize_guest_join(guestConnection, {
        body: {
            device_id: randomDeviceId,
            href: "https://example.com",
            referrer: "https://referrer.com",
            ip: "192.168.1.1",
        },
    });
    // 3. Prepare search parameter
    const searchSubstring = randomDeviceId.substring(0, 4);
    // 4. Make index call
    const response = await api.functional.reddit.guest.guests.index(guestConnection, {
        body: { search: searchSubstring },
    });
    typia.assert(response);
    // 5. Validate response
    TestValidator.equals("device_id matches", response.data[0].device_id, randomDeviceId);
    TestValidator.equals("data count is 1", response.data.length, 1);
}