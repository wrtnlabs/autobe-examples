import { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardSystemSettingCollector {
  export async function collect(props: {
    body: IDiscussionBoardSystemSetting.ICreate;
    key: string;
    value: string;
  }) {
    const id = v4();
    return {
      id,
      key: props.key,
      value: props.value,
      description: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } satisfies Prisma.discussion_board_system_settingsCreateInput;
  }
}
