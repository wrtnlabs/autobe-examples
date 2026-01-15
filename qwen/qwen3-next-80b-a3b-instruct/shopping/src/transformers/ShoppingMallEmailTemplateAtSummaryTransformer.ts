import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallEmailTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEmailTemplate";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallEmailTemplateAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_email_templatesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        subject: true,
        trigger: true,
        context: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        body: true,
      },
    } satisfies Prisma.shopping_mall_email_templatesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallEmailTemplate.ISummary> {
    return {
      id: input.id,
      template_type: input.name,
      subject: input.subject,
      is_active: input.trigger === "active",
      usage_count: Number(input.context),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      last_used_at: new Date("2300-01-01").toISOString(),
    };
  }
}
