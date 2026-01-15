import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformShipmentCost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentCost";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_shipment_cost_retrieval_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.IJoin;
  const memberAuth: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, { body: memberData });
  // Step 2: Generate valid shipmentId and costId for retrieval
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  const costId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Retrieve the shipment cost record using the authenticated member connection
  const costRecord: ICommunityPlatformShipmentCost =
    await api.functional.communityPlatform.member.shipments.costs.at(
      memberConnection,
      {
        shipmentId,
        costId,
      },
    );
  // Step 4: Validate the retrieved cost record using typia.assert for full type validation
  typia.assert(costRecord);
  // Step 5: Validate business-specific properties
  TestValidator.equals(
    "cost record has correct shipment_id",
    costRecord.shipment_id,
    shipmentId,
  );
  TestValidator.equals(
    "cost record has correct cost_id",
    costRecord.id,
    costId,
  );
  // Validate cost_type is one of the allowed values
  TestValidator.predicate(
    "cost_type is a valid category",
    [
      "base_shipping",
      "insurance_premium",
      "handling_charge",
      "customs_duty",
      "fuel_surcharge",
      "other",
    ].includes(costRecord.cost_type),
  );
  // Validate amount is positive and has exactly two decimal places
  TestValidator.predicate(
    "amount is positive and with two decimal places",
    costRecord.amount > 0 &&
      costRecord.amount === Math.round(costRecord.amount * 100) / 100,
  );
  // Validate currency is a valid 3-letter ISO 4217 code
  TestValidator.predicate(
    "currency is a valid ISO 4217 code",
    /^[A-Z]{3}$/.test(costRecord.currency),
  );
  // Validate description if present
  if (costRecord.description !== undefined) {
    TestValidator.predicate(
      "description is a string",
      typeof costRecord.description === "string",
    );
    TestValidator.predicate(
      "description length is <= 500 characters",
      costRecord.description.length <= 500,
    );
  }
  // Validate created_at is in ISO 8601 date-time format
  TestValidator.predicate(
    "created_at is in valid ISO 8601 date-time format",
    /^(?:\d{4})-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12][0-9]|3[01])T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]\.\d{3}Z$/.test(
      costRecord.created_at,
    ),
  );
}
