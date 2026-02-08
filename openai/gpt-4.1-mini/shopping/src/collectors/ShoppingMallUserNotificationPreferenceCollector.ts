import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallUserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotificationPreference";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

function toISOStringSafe(date: Date | null | undefined): string | null {
  return date ? date.toISOString() : null;
}
export namespace ShoppingMallUserNotificationPreferenceCollector {
  export async function collect(props: {
    body: IShoppingMallUserNotificationPreference.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      channel_name: (props.body as any).channel_name ?? null,
      notification_type: (props.body as any).notification_type ?? null,
      is_enabled: (props.body as any).is_enabled ?? null,
      created_at: toISOStringSafe(new Date()) as string,
      updated_at: toISOStringSafe(new Date()) as string,
      deleted_at: toISOStringSafe((props.body as any).deleted_at) ?? null,
      customer: undefined,
      seller: undefined,
      administrator: undefined,
    } satisfies Prisma.shopping_mall_user_notification_preferencesCreateInput;
  }
}
