import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_registration_with_custom_display_name(
  connection: api.IConnection,
): Promise<void> {
  const customDisplayName = RandomGenerator.name();
  const email = typia.assert<string & tags.Format<"email">>(typia.random<string>());
  const password = RandomGenerator.alphaNumeric(16);
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_guest_join(joinConnection, {
    body: {
      email,
      password,
      displayName: customDisplayName,
      href: typia.assert<string & tags.Format<"uri">>(typia.random<string>()),
      referrer: typia.assert<string & tags.Format<"uri">>(typia.random<string>()),
      ip: typia.assert<string & tags.Format<"ipv4">>(typia.random<string>()),
    } satisfies IEconomicPoliticalBoardGuest.IJoin,
  });
  typia.assert(joinResponse);
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers!.Authorization = joinResponse.token.access;
  typia.assert(joinResponse.token);
  typia.assert<string & tags.Format<"uuid">>(joinResponse.id);
}