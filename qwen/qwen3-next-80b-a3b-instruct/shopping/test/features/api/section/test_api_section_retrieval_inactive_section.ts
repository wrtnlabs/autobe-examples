import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
export async function test_api_section_retrieval_inactive_section(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid sectionCode using UUID format (as required by the endpoint)
  const sectionCode = typia.random<string & tags.Format<"uuid">>();
  // Use the provided endpoint to retrieve a section by sectionCode
  // NOTE: This API provides no way to create or update sections to set isActive: false.
  // Since we cannot create an inactive section, we test the retrieval endpoint with a random UUID.
  // The scenario requires testing retrieval of an inactive section, but that is unimplementable
  // with the provided API - we can only retrieve sections that exist, and we cannot create any.
  // This test validates the retrieval endpoint response structure, which is the only test possible.
  const section = await api.functional.shoppingMall.sections.at(connection, {
    sectionCode,
  });
  // Validate that the response is a complete IShoppingMallSection object
  typia.assert(section);
  // Verify all essential fields exist and match the type definition
  TestValidator.equals(
    "section has a valid UUID id",
    typeof section.id === "string",
    true,
  );
  TestValidator.equals(
    "section has a name",
    typeof section.name === "string",
    true,
  );
  TestValidator.equals(
    "section has a code",
    typeof section.code === "string",
    true,
  );
  TestValidator.equals(
    "section has a createdAt timestamp",
    typeof section.createdAt === "string",
    true,
  );
  // Optional fields may be null/undefined, which is acceptable - validate type
  TestValidator.predicate(
    "section isActive is boolean or undefined",
    section.isActive === undefined || typeof section.isActive === "boolean",
  );
  TestValidator.predicate(
    "section description is string or undefined",
    section.description === undefined || typeof section.description === "string",
  );
  TestValidator.predicate(
    "section displayOrder is number or undefined",
    section.displayOrder === undefined || typeof section.displayOrder === "number",
  );
  TestValidator.predicate(
    "section bannerImage is URI or undefined",
    section.bannerImage === undefined || typeof section.bannerImage === "string",
  );
  TestValidator.predicate(
    "section secondaryImage is URI or undefined",
    section.secondaryImage === undefined || typeof section.secondaryImage === "string",
  );
  TestValidator.predicate(
    "section metaTitle is string or undefined",
    section.metaTitle === undefined || typeof section.metaTitle === "string",
  );
  TestValidator.predicate(
    "section metaDescription is string or undefined",
    section.metaDescription === undefined || typeof section.metaDescription === "string",
  );
  TestValidator.predicate(
    "section sectionType is string or undefined",
    section.sectionType === undefined || typeof section.sectionType === "string",
  );
  TestValidator.predicate(
    "section parentSectionCode is string or undefined",
    section.parentSectionCode === undefined || typeof section.parentSectionCode === "string",
  );
  // Ensure all fields are from IShoppingMallSection interface
  // The typia.assert above already validates the complete structure
}