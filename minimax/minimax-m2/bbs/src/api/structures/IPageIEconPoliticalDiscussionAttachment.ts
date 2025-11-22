import { IPage } from "./IPage";
import { IEconPoliticalDiscussionAttachment } from "./IEconPoliticalDiscussionAttachment";

export namespace IPageIEconPoliticalDiscussionAttachment {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEconPoliticalDiscussionAttachment.ISummary[];
  };
}
