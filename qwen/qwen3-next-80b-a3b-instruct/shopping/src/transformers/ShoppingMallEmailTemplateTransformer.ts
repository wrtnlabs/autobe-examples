import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallEmailTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEmailTemplate";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallEmailTemplateTransformer {
  export type Payload = Prisma.shopping_mall_email_templatesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        subject: true,
        body: true,
        trigger: true,
        context: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.shopping_mall_email_templatesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallEmailTemplate> {
    // Extract template_key from trigger field (assumed JSON containing key)
    const templateKey =
      typeof input.trigger === "string" ? input.trigger : "default_template";
    // Parse context as JSON to extract variables, created_by, updated_by, version
    const context =
      typeof input.context === "string" ? JSON.parse(input.context) : {};
    // Extract body_html and body_text from body field (assumed JSON with html and text properties)
    const bodyData =
      typeof input.body === "string"
        ? JSON.parse(input.body)
        : { html: "", text: "" };
    return {
      id: input.id,
      template_key: templateKey,
      name: input.name,
      subject: input.subject,
      body_html: bodyData.html,
      body_text: bodyData.text,
      variables: Array.isArray(context.variables)
        ? context.variables
        : undefined,
      is_active:
        typeof context.is_active === "boolean" ? context.is_active : true,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      created_by: context.created_by || "",
      updated_by: context.updated_by || "",
      version: typeof context.version === "number" ? context.version : 1,
    };
  }
}
