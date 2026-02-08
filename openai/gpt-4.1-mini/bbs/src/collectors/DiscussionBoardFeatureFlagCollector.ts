import { IDiscussionBoardFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardFeatureFlag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardFeatureFlagCollector {
  export async function collect(props: {
    body: IDiscussionBoardFeatureFlag.ICreate;
  }) {
    return {
      id: v4(),
      code: "",
      name: "",
      description: "",
      enabled: false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } satisfies Prisma.discussion_board_feature_flagsCreateInput;
  }
}
