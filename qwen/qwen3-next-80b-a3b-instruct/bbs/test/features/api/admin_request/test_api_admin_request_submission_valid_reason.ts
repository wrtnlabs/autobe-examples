import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdminRequest";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";
import { generate_random_economic_board_citizen_admin_requests_create } from "../../../generate/generate_random_economic_board_citizen_admin_requests_create";
import { prepare_random_economic_board_admin_request } from "../../../prepare/prepare_random_economic_board_admin_request";

export async function test_api_admin_request_submission_valid_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a citizen
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizenCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IEconomicBoardCitizen.IJoin;
  await authorize_citizen_join(citizenConnection, { body: citizenCredentials });
  // 2. Submit an administrator request with a 150-character reason
  const reasonText = RandomGenerator.alphabets(150);
  // The response type is IEconomicBoardAdminRequest which is defined as {} - empty object
  // We can only trust that if it doesn't throw, the request was accepted
  const adminRequest =
    await generate_random_economic_board_citizen_admin_requests_create(
      citizenConnection,
      {
        body: {
          reason_text: reasonText,
        } satisfies IEconomicBoardAdminRequest.ICreate,
      },
    );
  typia.assert(adminRequest);
  // No assertions on properties because IEconomicBoardAdminRequest = {} is the type
}
