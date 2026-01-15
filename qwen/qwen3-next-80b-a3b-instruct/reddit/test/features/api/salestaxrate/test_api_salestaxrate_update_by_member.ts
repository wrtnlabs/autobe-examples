import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformSaleTaxRate } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSaleTaxRate";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_salestaxrate_update_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create new connection for member
  const memberConnection: api.IConnection = { host: connection.host };
  // Step 2: Authenticate member via authorization function
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // Step 3: Use memberConnection from now on (headers updated by authorization function)
  // Step 4: Update sales tax rate
  const taxCode = "US-CA-SALES";
  const updatedRate = 8.5;
  const description =
    "Updated tax rate per California SB-123 effective Jan 1, 2026";
  const updatedTaxRate =
    await api.functional.communityPlatform.member.salestaxrates.update(
      memberConnection,
      {
        taxCode,
        body: {
          percentage: updatedRate,
          description,
        } satisfies ICommunityPlatformSaleTaxRate.IUpdate,
      },
    );
  typia.assert(updatedTaxRate);
  // Step 5: Validate rate was updated correctly
  const updatedRateValue = typia.assert(updatedTaxRate.rate!);
  TestValidator.equals(
    "updated tax rate percentage",
    updatedRateValue,
    updatedRate / 100,
  );
  TestValidator.equals(
    "updated tax rate description",
    updatedTaxRate.description,
    description,
  );
  // Step 6: Validate rate is within allowed range (0.0% to 20.0%)
  TestValidator.predicate(
    "rate is between 0 and 1 (0% to 100%)",
    updatedRateValue >= 0 && updatedRateValue <= 1,
  );
}
