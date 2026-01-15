import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventoryItem";
import type { ICommunityPlatformInventoryItemShippingDimensions } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventoryItemShippingDimensions";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_inventory_item_update_by_member(connection: api.IConnection): Promise<void> {
    // Create actor-specific connection for member
    const memberConnection: api.IConnection = { host: connection.host };
    // Step 1: Authenticate member via join (using utility function - priority over SDK)
    const memberAuth = await authorize_member_join(memberConnection, {
        body: {
            email: typia.random<string & tags.Format<'email'>>(),
            password: RandomGenerator.alphaNumeric(16),
            href: "https://example.com/join",
            referrer: "https://example.com/home"
        } satisfies ICommunityPlatformMember.IJoin
    });
    typia.assert(memberAuth);
    // Step 2: Generate a valid UUID for itemId (since no create function exists)
    // We MUST use a valid UUID as itemId even though we cannot create items
    const itemId = typia.random<string & tags.Format<'uuid'>>();
    // Step 3: Update the inventory item with valid data
    // Use ICommunityPlatformInventoryItem.IUpdate type for request body
    // Note: According to DTO, ICommunityPlatformInventoryItem is string, not object
    // So metadata must be string, not object
    const updateDetails = {
        name: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 12 }),
        description: RandomGenerator.content({ paragraphs: 1, sentenceMin: 10, sentenceMax: 20, wordMin: 4, wordMax: 8 }),
        quantity: typia.random<number & tags.Type<'int32'> & tags.Minimum<0>>(),
        status: RandomGenerator.pick(["in_stock", "low_stock", "out_of_stock", "maintenance", "discontinued"] as const),
        category_id: typia.random<string & tags.Format<'uuid'>>(),
        reorder_threshold: typia.random<number & tags.Type<'int32'> & tags.Minimum<0>>(),
        metadata: "{\"batch_number\": \"BATCH-ABC123\", \"expiration_date\": \"2026-01-12T08:21:43.152Z\"}", // Must be string, not object
        tags: ArrayUtil.repeat(typia.random<number & tags.Type<'int32'> & tags.Minimum<1> & tags.Maximum<10>>(), () => RandomGenerator.name()),
        shipping_dimensions: {
            length_cm: typia.random<number & tags.Minimum<0>>(),
            width_cm: typia.random<number & tags.Minimum<0>>(),
            height_cm: typia.random<number & tags.Minimum<0>>(),
            weight_kg: typia.random<number & tags.Minimum<0>>()
        }
    } satisfies ICommunityPlatformInventoryItem.IUpdate;
    // Call the update function with valid parameters
    // The update endpoint returns a string according to ICommunityPlatformInventoryItem
    const updatedItem = await api.functional.communityPlatform.member.inventory_items.update(memberConnection, {
        itemId: itemId,
        body: updateDetails
    });
    // Validate the response is a non-empty string (as per the DTO definition)
    typia.assert<string>(updatedItem);
    TestValidator.predicate("update response is non-empty string", updatedItem.length > 0);
    // Validate quantity is non-negative - though we can't access it in the response
    // Since response is string, we can't validate the contents
    // We can only validate the call succeeds
    // Validate status is one of the allowed values - can't validate since we don't get object
    // Focus validation on what we can do: ensure the update call succeeds
    // and returns a string as defined in the schema
}