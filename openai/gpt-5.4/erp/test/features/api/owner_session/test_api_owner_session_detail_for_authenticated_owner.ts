import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import type { IHrmTimeTrackingOwnerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwnerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

export async function test_api_owner_session_detail_for_authenticated_owner(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password1234!",
    href: `https://example.com/${RandomGenerator.alphabets(8)}`,
    referrer: `https://referrer.example.com/${RandomGenerator.alphabets(8)}`,
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmTimeTrackingOwner.IJoin;
  const authorized = await authorize_owner_join(ownerConnection, {
    body: joinInput,
  });
  typia.assert(authorized);
  await TestValidator.httpError(
    "owner cannot retrieve an unrelated or undiscoverable session by arbitrary identifier",
    [403, 404],
    async () => {
      await api.functional.hrmTimeTracking.owner.sessions.at(ownerConnection, {
        sessionId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
