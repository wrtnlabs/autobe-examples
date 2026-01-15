import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_verification(connection: api.IConnection) {
    const guestConnection: api.IConnection = { host: connection.host };
    const guestSession = await authorize_guest_join(guestConnection, {
        body: {
            href: `https://${RandomGenerator.alphaNumeric(8)}.com/${RandomGenerator.alphaNumeric(5)}`,
            referrer: `https://${RandomGenerator.alphaNumeric(8)}.com/${RandomGenerator.alphaNumeric(5)}`,
            ip: null
        }
    }) satisfies IDiscussionBoardMember.IAuthorized;
    const sessionStatus = await api.functional.guest.verify(guestConnection) satisfies IDiscussionBoardMember.IStatus;
    typia.assert(guestSession);
    typia.assert(sessionStatus);
    TestValidator.predicate("Guest session should be valid", sessionStatus.isValid);
}