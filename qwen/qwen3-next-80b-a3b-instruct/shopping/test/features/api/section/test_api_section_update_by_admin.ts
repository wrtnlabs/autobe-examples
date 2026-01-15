import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallSectionCustomProperties } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSectionCustomProperties";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_section_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/admin/join",
        referrer: "https://example.com/admin/signup",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  // Create a section using update (which creates if non-existent based on API description)
  const randomCode = RandomGenerator.alphaNumeric(8);
  const section = await api.functional.shoppingMall.admin.sections.update(
    adminConnection,
    {
      sectionCode: randomCode,
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 4,
          wordMax: 8,
        }),
        sort_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        is_active: true,
        meta_description: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
        }),
      } satisfies IShoppingMallSection.IUpdate,
    },
  );
  typia.assert(section);
  // Update the section with partial data
  const updatedSection =
    await api.functional.shoppingMall.admin.sections.update(adminConnection, {
      sectionCode: randomCode,
      body: {
        title: "Updated Title",
        description: "Updated description",
        is_active: false,
        sort_order: 5,
        meta_description: "Updated meta description",
      } satisfies IShoppingMallSection.IUpdate,
    });
  typia.assert(updatedSection);
  // Validate the update: modified fields should be updated
  TestValidator.equals("title updated", updatedSection.name, "Updated Title");
  TestValidator.equals(
    "description updated",
    updatedSection.description,
    "Updated description",
  );
  TestValidator.equals("is_active updated", updatedSection.isActive, false);
  TestValidator.equals("sort_order updated", updatedSection.displayOrder, 5);
  TestValidator.equals(
    "meta_description updated",
    updatedSection.metaDescription,
    "Updated meta description",
  );
  // Validate unchanged fields remain the same
  TestValidator.equals("code preserved", updatedSection.code, randomCode);
  TestValidator.equals(
    "createdAt preserved",
    updatedSection.createdAt,
    section.createdAt,
  );
  // Confirm bannerImage and other unspecified fields were unchanged
  TestValidator.equals(
    "bannerImage preserved",
    updatedSection.bannerImage,
    section.bannerImage,
  );
}
