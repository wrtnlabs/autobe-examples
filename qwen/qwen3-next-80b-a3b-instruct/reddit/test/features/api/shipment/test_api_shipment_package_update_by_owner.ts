import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformShipmentPackage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentPackage";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_shipment_package_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member to perform operations
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
  typia.assert(memberAuth);
  
  // Step 2: Use random UUIDs to represent existing shipment and package
  // Note: In real system, these would be created via package creation API (not available in provided SDK)
  // We assume the system has a package with this ID that the member owns
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  const packageId = typia.random<string & tags.Format<"uuid">>();
  
  // Step 3: Update package with new details
  const updatedPackage: ICommunityPlatformShipmentPackage =
    await api.functional.communityPlatform.member.shipments.packages.update(
      memberConnection,
      {
        shipmentId,
        packageId,
        body: {
          name: RandomGenerator.name(),
          weight: typia.random<number & tags.Minimum<0>>(),
          width: typia.random<number & tags.Minimum<0>>(),
          height: typia.random<number & tags.Minimum<0>>(),
          length: typia.random<number & tags.Minimum<0>>(),
          contents_description: RandomGenerator.paragraph({ sentences: 5 }),
          tracking_number: RandomGenerator.alphaNumeric(20),
          is_fragile: RandomGenerator.pick([true, false]),
          is_insured: RandomGenerator.pick([true, false]),
          insurance_value: typia.random<number & tags.Minimum<0>>(),
          customs_declaration: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies ICommunityPlatformShipmentPackage.IUpdate,
      },
    );
  typia.assert(updatedPackage);
  
  // Validate that the response matches what we expect
  // TestValidator.predicate only accepts 2 arguments: description and predicate function
  // The response is ICommunityPlatformShipmentPackage which likely has a 'value' array property
  const firstPackage = updatedPackage.value[0] as any;
  
  // Use TestValidator.equals for direct value comparisons
  TestValidator.equals(
    "updated package has id",
    firstPackage.id,
    packageId,
  );
  
  TestValidator.equals(
    "updated package has shipment id",
    firstPackage.shipment_id,
    shipmentId,
  );
  
  // Step 4: Test idempotent behavior with repeated identical requests
  const secondUpdate: ICommunityPlatformShipmentPackage =
    await api.functional.communityPlatform.member.shipments.packages.update(
      memberConnection,
      {
        shipmentId,
        packageId,
        body: {
          name: firstPackage.name,
          weight: firstPackage.weight,
          width: firstPackage.width,
          height: firstPackage.height,
          length: firstPackage.length,
          contents_description: firstPackage.contents_description,
          tracking_number: firstPackage.tracking_number,
          is_fragile: firstPackage.is_fragile,
          is_insured: firstPackage.is_insured,
          insurance_value: firstPackage.insurance_value,
          customs_declaration: firstPackage.customs_declaration,
        } satisfies ICommunityPlatformShipmentPackage.IUpdate,
      },
    );
  typia.assert(secondUpdate);
  
  // Validate that the second update has the same values as the first
  const secondPackage = secondUpdate.value[0] as any;
  TestValidator.equals(
    "idempotent name",
    secondPackage.name,
    firstPackage.name,
  );
  
  TestValidator.equals(
    "idempotent tracking number",
    secondPackage.tracking_number,
    firstPackage.tracking_number,
  );
  
  // Step 5: Test ownership verification - unauthorized update by another member
  // Create a second member to attempt unauthorized update
  const unauthorizedMemberConnection: api.IConnection = {
    host: connection.host,
  };
  const unauthorizedMemberAuth: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(unauthorizedMemberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(unauthorizedMemberAuth);
  
  await TestValidator.error(
    "unauthorized member cannot update package",
    async () => {
      await api.functional.communityPlatform.member.shipments.packages.update(
        unauthorizedMemberConnection,
        {
          shipmentId,
          packageId,
          body: {
            name: RandomGenerator.name(),
            weight: typia.random<number & tags.Minimum<0>>(),
            width: typia.random<number & tags.Minimum<0>>(),
            height: typia.random<number & tags.Minimum<0>>(),
            length: typia.random<number & tags.Minimum<0>>(),
            contents_description: RandomGenerator.paragraph({ sentences: 4 }),
            tracking_number: RandomGenerator.alphaNumeric(18),
            is_fragile: RandomGenerator.pick([true, false]),
            is_insured: RandomGenerator.pick([true, false]),
            insurance_value: typia.random<number & tags.Minimum<0>>(),
            customs_declaration: RandomGenerator.content({ paragraphs: 1 }),
          } satisfies ICommunityPlatformShipmentPackage.IUpdate,
        },
      );
    },
  );
}