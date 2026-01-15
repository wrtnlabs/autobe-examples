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
export async function test_api_email_template_update_subject_content(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate via join utility
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
  // Step 2: Create a new email template using generation utility
  const templateBefore: IShoppingMallEmailTemplate =
    await generate_random_shopping_mall_admin_email_templates_create(
      adminConnection,
      {
        body: {
          templateKey: `welcome_email_${RandomGenerator.alphaNumeric(6)}`,
          subject: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 8,
          }),
          body: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 10,
            sentenceMax: 15,
            wordMin: 4,
            wordMax: 8,
          }),
          fromAddress: "noreply@shoppingmall.com",
          isHtml: true,
        } satisfies IShoppingMallEmailTemplate.ICreate,
      },
    );
  typia.assert(templateBefore);
  const originalVersion = templateBefore.version;
  const originalCreatedAt = templateBefore.created_at;
  const originalUpdatedAt = templateBefore.updated_at;
  // Step 3: Prepare update data with new subject
  const updatedSubject = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  // Step 4: Update email template using SDK function
  const updatedTemplate: IShoppingMallEmailTemplate =
    await api.functional.shoppingMall.admin.email.templates.update(
      adminConnection,
      {
        templateId: templateBefore.id,
        body: {
          subject: updatedSubject,
        } satisfies IShoppingMallEmailTemplate.IUpdate,
      },
    );
  typia.assert(updatedTemplate);
  // Step 5: Validate that only subject and updated_at were changed
  TestValidator.equals(
    "template ID unchanged",
    updatedTemplate.id,
    templateBefore.id,
  );
  TestValidator.equals(
    "template_key unchanged",
    updatedTemplate.template_key,
    templateBefore.template_key,
  );
  TestValidator.equals(
    "version incremented",
    updatedTemplate.version,
    originalVersion + 1,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedTemplate.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updatedTemplate.updated_at,
    originalUpdatedAt,
  );
  TestValidator.equals(
    "subject updated",
    updatedTemplate.subject,
    updatedSubject,
  );
  TestValidator.equals(
    "body_html unchanged",
    updatedTemplate.body_html,
    templateBefore.body_html,
  );
  TestValidator.equals(
    "body_text unchanged",
    updatedTemplate.body_text,
    templateBefore.body_text,
  );
  TestValidator.equals(
    "variables unchanged",
    updatedTemplate.variables,
    templateBefore.variables,
  );
  TestValidator.equals(
    "is_active unchanged",
    updatedTemplate.is_active,
    templateBefore.is_active,
  );
  TestValidator.equals(
    "created_by unchanged",
    updatedTemplate.created_by,
    templateBefore.created_by,
  );
  TestValidator.equals(
    "updated_by matches admin",
    updatedTemplate.updated_by,
    admin.id,
  );
}
