import { IEcommerceSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceSystemSettingTransformer {
  export type Payload = Prisma.ecommerce_system_settingsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        setting_key: true,
        value_type: true,
        setting_value: true,
        description: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        metadataRegistries: true,
      },
    } satisfies Prisma.ecommerce_system_settingsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceSystemSetting> {
    return {
      id: input.id,
      setting_key: input.setting_key,
      value_type: input.value_type,
      setting_value: input.setting_value,
      description: input.description,
      is_active: input.is_active,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
