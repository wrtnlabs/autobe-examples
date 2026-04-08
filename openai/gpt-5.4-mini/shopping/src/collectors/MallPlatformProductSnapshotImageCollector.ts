import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotImage";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace MallPlatformProductSnapshotImageCollector {
  export async function collect(props: {
    body: IMallPlatformProductSnapshotImage.ICreate;
    productSnapshot: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      image_uri: props.body.imageUri,
      sort_order: props.body.sortOrder,
      created_at: new Date(),
      productSnapshot: {
        connect: {
          id: props.productSnapshot.id,
        },
      },
    } satisfies Prisma.mall_platform_product_snapshot_imagesCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace MallPlatformProductSnapshotImageCollector {
//         export async function collect(props: {
//           body: IMallPlatformProductSnapshotImage.ICreate;
//           mallPlatformProductSnapshots: IEntity; // from path parameter productSnapshotId
//           
//           
//         }) {
//           return {
//       id: ...,
//       image_uri: ...,
//       sort_order: ...,
//       created_at: ...,
//       productSnapshot: ...,
//           } satisfies Prisma.mall_platform_product_snapshot_imagesCreateInput;
//         }
//       }
//--------------------------------------------------------------