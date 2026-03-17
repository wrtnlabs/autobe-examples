import { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformProfileFileCollector {
  export async function collect(props: {
    body: ICommunityPlatformProfileFile.ICreate;
    profile: IEntity;
  }) {
    return {
      id: v4(),
      category: props.body.category,
      original_name: props.body.original_name,
      extension: props.body.extension,
      mime_type: props.body.mime_type,
      size: props.body.size,
      url: props.body.url,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      profile: {
        connect: {
          id: props.profile.id,
        },
      },
    } satisfies Prisma.community_platform_profile_filesCreateInput;
  }
}
