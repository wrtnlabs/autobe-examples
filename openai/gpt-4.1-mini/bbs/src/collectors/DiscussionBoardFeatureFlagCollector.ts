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
    const id: string = v4();
    const now = new Date();
    return {
      id,
      code: props.body.code,
      name: props.body.name,
      description: props.body.description,
      enabled: props.body.enabled,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    } satisfies Prisma.discussion_board_feature_flagsCreateInput;
  }
}
