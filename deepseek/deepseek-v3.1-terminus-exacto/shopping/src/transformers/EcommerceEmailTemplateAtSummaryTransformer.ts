import { IEcommerceEmailTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceEmailTemplate";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceEmailTemplateAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_email_templatesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        code: true,
        name: true,
        category: true,
        is_active: true,
        version: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        subject: true,
        html_content: true,
        text_content: true,
        description: true,
      },
    } satisfies Prisma.ecommerce_email_templatesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceEmailTemplate.ISummary> {
    return {
      id: input.id,
      code: input.code,
      name: input.name,
      category: input.category,
      is_active: input.is_active,
      version: input.version,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
