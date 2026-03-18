import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_organization_deletion_success_and_blocked_cases(
  connection: api.IConnection,
): Promise<void> {
  // This test suite requires organizationId extraction and timesheet creation / non-owner association flows,
  // but the provided API surface only includes:
  // - member join (authorize_member_join)
  // - timesheet submit (submit)
  // - organization delete (erase)
  // and the available DTOs for join response (IAuthorized) do not include organizationId.
  //
  // To avoid inventing non-existent API calls or response fields, we fail fast here.
  const memberConnection: api.IConnection = { host: connection.host };
  const joinEmail: string = typia.random<string & tags.Format<"email">>();
  const password: string = typia.random<string>();
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email: joinEmail,
      password,
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1 as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<12>,
      href: `https://${RandomGenerator.alphabets(8)}.example.com`,
      referrer: `https://ref-${RandomGenerator.alphabets(8)}.example.com`,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(joinResult);
  // We cannot proceed to deletion because organizationId is not available in IAuthorized
  // and no organization retrieval endpoint was provided.
  throw new Error(
    "Cannot run organization deletion scenarios: organizationId is not available from join response (IAuthorized has only id/token) and no API for organizationId retrieval/creation aside from implicit join context is provided in the available endpoint list.",
  );
}
