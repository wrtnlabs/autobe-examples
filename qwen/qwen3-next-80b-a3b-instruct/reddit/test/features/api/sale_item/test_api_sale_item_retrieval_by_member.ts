import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformSaleItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSaleItem";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_sale_item_retrieval_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate a member to establish authorized access
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData: ICommunityPlatformMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://example.com/home",
  } satisfies ICommunityPlatformMember.IJoin;
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, { body: memberData });
  typia.assert(member);
  // Step 2: Test retrieval of a sales item using correct saleCode and itemSku
  // We generate valid UUID for saleCode and random string for itemSku
  // These parameters should exist on a real system for this test to pass
  // We cannot create items, so we assume the system contains valid data for these parameters
  const saleCode: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const itemSku: string = RandomGenerator.alphaNumeric(10);
  // Attempt retrieval of the item
  const retrievedItem: ICommunityPlatformSaleItem =
    await api.functional.communityPlatform.member.sales.items.at(
      memberConnection,
      {
        saleCode,
        itemSku,
      },
    );
  typia.assert(retrievedItem);
  // Step 3: Validate that the retrieved item has the correct structure of ICommunityPlatformSaleItem
  // We cannot validate keys like item_sku, quantity, etc. because we didn't create them
  // But we can verify the type structure and that it is not null/undefined
  // Our assertion is that the response is a valid ICommunityPlatformSaleItem
  TestValidator.predicate("item has valid UUID id", () => {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(retrievedItem.id);
  });
  TestValidator.predicate("item has valid item_sku", () => {
    return (
      typeof retrievedItem.item_sku === "string" &&
      retrievedItem.item_sku.length > 0
    );
  });
  TestValidator.predicate("item has valid quantity", () => {
    return (
      Number.isInteger(retrievedItem.quantity) && retrievedItem.quantity >= 1
    );
  });
  TestValidator.predicate("item has valid unit_price", () => {
    return (
      typeof retrievedItem.unit_price === "number" &&
      retrievedItem.unit_price >= 0
    );
  });
  TestValidator.predicate("item has valid total_amount", () => {
    return (
      typeof retrievedItem.total_amount === "number" &&
      retrievedItem.total_amount >= 0
    );
  });
  TestValidator.predicate("item has valid tax_amount", () => {
    return (
      typeof retrievedItem.tax_amount === "number" &&
      retrievedItem.tax_amount >= 0
    );
  });
  TestValidator.predicate("item has valid status", () => {
    return (
      retrievedItem.status === "active" || retrievedItem.status === "canceled"
    );
  });
  TestValidator.predicate("item has valid created_at timestamp", () => {
    const date = new Date(retrievedItem.created_at);
    return !isNaN(date.getTime());
  });
}
