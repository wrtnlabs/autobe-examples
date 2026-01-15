import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProductPriceRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductPriceRule";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_product_pricerule_retrieval_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a member-specific connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  // memberConnection.headers updated internally by authorize function
  // Step 2: Generate a random product code and rule ID
  const productCode: string = typia.random<string>();
  const ruleId: string = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Retrieve the rule
  const retrievedRule: ICommunityPlatformProductPriceRule =
    await api.functional.communityPlatform.products.pricerules.at(
      memberConnection,
      {
        productCode: productCode,
        ruleId: ruleId,
      },
    );
  // Step 4: Validate the response is type-safe — this is our validation
  typia.assert(retrievedRule);
}
