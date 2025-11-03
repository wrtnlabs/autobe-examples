import { IPage } from "./IPage";
import { ITodoAppFeatureFlag } from "./ITodoAppFeatureFlag";

export namespace IPageITodoAppFeatureFlag {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoAppFeatureFlag.ISummary[];
  };
}
