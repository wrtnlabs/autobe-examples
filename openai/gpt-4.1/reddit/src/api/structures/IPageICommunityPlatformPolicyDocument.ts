import { IPage } from "./IPage";
import { ICommunityPlatformPolicyDocument } from "./ICommunityPlatformPolicyDocument";

export namespace IPageICommunityPlatformPolicyDocument {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformPolicyDocument.ISummary[];
  };
}
