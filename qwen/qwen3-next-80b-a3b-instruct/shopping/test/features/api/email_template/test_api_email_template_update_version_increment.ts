import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallEmailTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEmailTemplate";
import { prepare_random_shopping_mall_email_template } from "../../../prepare/prepare_random_shopping_mall_email_template";
import { generate_random_shopping_mall_admin_email_templates_create } from "../../../generate/generate_random_shopping_mall_admin_email_templates_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_email_template_update_version_increment(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate admin user
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Create a new email template
  const createdTemplate: IShoppingMallEmailTemplate =
    await generate_random_shopping_mall_admin_email_templates_create(
      adminConnection,
      {
        body: {
          templateKey: `test_template_${RandomGenerator.alphaNumeric(8)}`,
          subject: RandomGenerator.paragraph({ sentences: 3 }),
          body: RandomGenerator.content(),
          fromAddress: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(typia.random<string & tags.Format<"email">>()),
          isHtml: true,
        } satisfies IShoppingMallEmailTemplate.ICreate,
      },
    );
  typia.assert(createdTemplate);
  // Store initial values before update
  const initialVersion = createdTemplate.version;
  const initialCreatedAt = createdTemplate.created_at;
  const initialUpdatedAt = createdTemplate.updated_at;
  // Step 3: Update the email template
  const updatedTemplate: IShoppingMallEmailTemplate =
    await api.functional.shoppingMall.admin.email.templates.update(
      adminConnection,
      {
        templateId: createdTemplate.id,
        body: {
          subject: createdTemplate.subject,
        } satisfies IShoppingMallEmailTemplate.IUpdate,
      },
    );
  typia.assert(updatedTemplate);
  // Step 4: Validate version increment (must increase by exactly 1)
  TestValidator.equals(
    "version incremented by exactly 1",
    updatedTemplate.version,
    initialVersion + 1,
  );
  // Step 5: Validate created_at remains unchanged
  TestValidator.equals(
    "created_at remains unchanged",
    updatedTemplate.created_at,
    initialCreatedAt,
  );
  // Step 6: Validate updated_at changes (is different from original)
  TestValidator.notEquals(
    "updated_at changes on update",
    updatedTemplate.updated_at,
    initialUpdatedAt,
  );
  // Step 7: Perform second update to verify sequential version progression
  const secondUpdateTemplate: IShoppingMallEmailTemplate =
    await api.functional.shoppingMall.admin.email.templates.update(
      adminConnection,
      {
        templateId: createdTemplate.id,
        body: {
          subject: createdTemplate.subject,
          is_active: false,
        } satisfies IShoppingMallEmailTemplate.IUpdate,
      },
    );
  typia.assert(secondUpdateTemplate);
  // Step 8: Validate version incremented again by exactly 1
  TestValidator.equals(
    "version incremented again by exactly 1",
    secondUpdateTemplate.version,
    updatedTemplate.version + 1,
  );
}