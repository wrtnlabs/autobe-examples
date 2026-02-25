import { IEcommerceSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceSystemSettingCollector {
  export async function collect(props: {
    body: IEcommerceSystemSetting.ICreate;
  }) {
    return {
      id: v4(),
      setting_key: props.body.setting_key,
      value_type: props.body.value_type,
      setting_value: props.body.setting_value,
      description: props.body.description,
      is_active: props.body.is_active,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } satisfies Prisma.ecommerce_system_settingsCreateInput;
  }
}
