import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_shopping_mall_admin_sections_create } from "../../../generate/generate_random_shopping_mall_admin_sections_create";
import { prepare_random_shopping_mall_section } from "../../../prepare/prepare_random_shopping_mall_section";

export async function test_api_section_retrieval_successful(
  connection: api.IConnection,
) {
  // Authenticating as administrator using utility function provided
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {} satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Creating a new section using the utility function to generate realistic test data
  const section: IShoppingMallSection =
    await generate_random_shopping_mall_admin_sections_create(
      adminConnection,
      {},
    );
  typia.assert(section);
  // Retrieving the section we just created using the specific endpoint
  const retrievedSection: IShoppingMallSection =
    await api.functional.shoppingMall.admin.sections.at(adminConnection, {
      sectionId: section.id,
    });
  typia.assert(retrievedSection);
  // Validating all metadata fields to ensure the section was correctly retrieved with all required details
  TestValidator.equals(
    "section name matches",
    retrievedSection.name,
    section.name,
  );
  TestValidator.equals(
    "section description matches",
    retrievedSection.description,
    section.description,
  );
  TestValidator.equals(
    "section parent matches",
    retrievedSection.parentSection,
    section.parentSection,
  );
  TestValidator.equals(
    "section position matches",
    retrievedSection.position,
    section.position,
  );
  TestValidator.equals(
    "section createdAt matches",
    retrievedSection.createdAt,
    section.createdAt,
  );
  TestValidator.equals(
    "section updatedAt matches",
    retrievedSection.updatedAt,
    section.updatedAt,
  );
}
