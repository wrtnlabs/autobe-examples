import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardGuest";
import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";
export async function test_api_guest_registration_with_verification(connection: api.IConnection) {
    const email = typia.random<string & tags.Format<"email">>();
    const password = typia.random<string & tags.MinLength<8> & tags.Pattern<"^(?=.*[A-Z]).{8,}$">>();
    const newConnection: api.IConnection = { host: connection.host };
    const response = await authorize_guest_join(newConnection, {
        body: {
            email,
            password
        }
    });
    typia.assert(response);
    TestValidator.equals("response has id", typeof response.id, "string");
    TestValidator.equals("response has token", typeof response.token, "object");
    TestValidator.equals("token has access", typeof response.token.access, "string");
    TestValidator.equals("token has refresh", typeof response.token.refresh, "string");
    TestValidator.equals("token has expired_at", typeof response.token.expired_at, "string");
    TestValidator.equals("token has refreshable_until", typeof response.token.refreshable_until, "string");
}